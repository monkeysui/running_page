"""
Python 3 API wrapper for Garmin Connect to get your statistics.
Copy most code from https://github.com/cyberjunky/python-garminconnect
"""

import argparse
import asyncio
import datetime as dt
import os
import sys


from config import FIT_FOLDER, GPX_FOLDER, JSON_FILE, SQL_FILE
from garmin_sync import Garmin, get_activity_id_list, get_downloaded_ids
from garmin_sync import download_garmin_data
from garmin_sync import download_new_activities
from utils import make_activities_file


def _summary_dto(summary):
    if not summary:
        return {}
    return summary.get("summaryDTO") or summary


def _activity_type(summary):
    dto = _summary_dto(summary)
    activity_type = dto.get("activityTypeDTO") or dto.get("activityType") or {}
    if isinstance(activity_type, dict):
        return activity_type.get("typeKey") or activity_type.get("type") or ""
    return str(activity_type or "")


def _parse_garmin_time(value):
    if not value:
        return None
    normalized = str(value).replace("Z", "+00:00")
    try:
        parsed = dt.datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=dt.timezone.utc)
        return parsed
    except ValueError:
        return None


def _is_same_activity(left, right):
    left_dto = _summary_dto(left)
    right_dto = _summary_dto(right)

    left_start = _parse_garmin_time(
        left_dto.get("startTimeGMT") or left_dto.get("startTimeLocal")
    )
    right_start = _parse_garmin_time(
        right_dto.get("startTimeGMT") or right_dto.get("startTimeLocal")
    )
    if left_start is None or right_start is None:
        return False

    left_distance = float(left_dto.get("distance") or 0)
    right_distance = float(right_dto.get("distance") or 0)
    left_duration = float(
        left_dto.get("duration") or left_dto.get("elapsedDuration") or 0
    )
    right_duration = float(
        right_dto.get("duration") or right_dto.get("elapsedDuration") or 0
    )

    time_close = abs((left_start - right_start).total_seconds()) <= 180
    distance_close = abs(left_distance - right_distance) <= max(
        100, left_distance * 0.02
    )
    duration_close = abs(left_duration - right_duration) <= 180

    left_type = _activity_type(left)
    right_type = _activity_type(right)
    type_close = not left_type or not right_type or left_type == right_type

    return time_close and distance_close and duration_close and type_close


async def _get_candidate_ids(client, latest_count):
    if latest_count and latest_count > 0:
        activities = await client.get_activities(0, latest_count)
        return [str(activity.get("activityId", "")) for activity in activities]
    return await get_activity_id_list(client)


async def _download_bridge_candidates(
    secret_string_cn,
    secret_string_global,
    downloaded_activity,
    is_only_running,
    latest_count,
    global_compare_count,
    bridge_only,
):
    cn_client = Garmin(secret_string_cn, "CN", is_only_running)
    global_client = Garmin(secret_string_global, "COM", is_only_running)

    cn_ids = await _get_candidate_ids(cn_client, latest_count)
    to_check_ids = [activity_id for activity_id in cn_ids if activity_id]
    to_check_ids = list(dict.fromkeys(to_check_ids))
    if downloaded_activity:
        to_check_ids = [
            activity_id
            for activity_id in to_check_ids
            if activity_id not in set(downloaded_activity)
        ]

    print(f"{len(to_check_ids)} Garmin CN activities to compare")

    global_activities = await global_client.get_activities(0, global_compare_count)
    new_ids = []
    id2title = {}

    for activity_id in to_check_ids:
        try:
            cn_summary = await cn_client.get_activity_summary(activity_id)
        except Exception as e:
            print(f"Failed to get CN activity summary {activity_id}: {str(e)}")
            continue

        if any(_is_same_activity(cn_summary, item) for item in global_activities):
            print(f"Skip {activity_id}: already exists in Garmin Global")
            if bridge_only:
                marker_path = os.path.join(FIT_FOLDER, f"{activity_id}.synced")
                with open(marker_path, "a", encoding="utf-8"):
                    pass
            continue

        activity_title = cn_summary.get("activityName", "")
        id2title[activity_id] = activity_title
        new_ids.append(activity_id)

    print(f"{len(new_ids)} new Garmin CN activities to bridge")
    await asyncio.gather(
        *[
            download_garmin_data(cn_client, activity_id, file_type="fit")
            for activity_id in new_ids
        ]
    )

    await cn_client.req.aclose()
    await global_client.req.aclose()
    return new_ids, id2title


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "cn_secret_string", nargs="?", help="secret_string fro get_garmin_secret.py"
    )
    parser.add_argument(
        "global_secret_string", nargs="?", help="secret_string fro get_garmin_secret.py"
    )
    parser.add_argument(
        "--only-run",
        dest="only_run",
        action="store_true",
        help="if is only for running",
    )
    parser.add_argument(
        "--latest-count",
        dest="latest_count",
        type=int,
        default=0,
        help="only inspect the latest N Garmin CN activities; 0 means all",
    )
    parser.add_argument(
        "--global-compare-count",
        dest="global_compare_count",
        type=int,
        default=200,
        help="number of recent Garmin Global activities used for duplicate checks",
    )
    parser.add_argument(
        "--skip-existing-global",
        dest="skip_existing_global",
        action="store_true",
        help="skip CN activities that already look present in Garmin Global",
    )
    parser.add_argument(
        "--bridge-only",
        dest="bridge_only",
        action="store_true",
        help="only bridge Garmin CN to Global; do not regenerate local page data",
    )

    options = parser.parse_args()
    secret_string_cn = options.cn_secret_string
    secret_string_global = options.global_secret_string
    auth_domain = "CN"
    is_only_running = options.only_run
    if secret_string_cn is None or secret_string_global is None:
        print("Missing argument nor valid configuration file")
        sys.exit(1)

    # Step 1:
    # Sync all activities from Garmin CN to Garmin Global in FIT format
    # If the activity is manually imported with a GPX, the GPX file will be synced

    # load synced activity list
    downloaded_fit = get_downloaded_ids(FIT_FOLDER)
    downloaded_gpx = get_downloaded_ids(GPX_FOLDER)
    downloaded_activity = list(set(downloaded_fit + downloaded_gpx))

    folder = FIT_FOLDER
    # make gpx or tcx dir
    if not os.path.exists(folder):
        os.mkdir(folder)

    if options.skip_existing_global or options.latest_count:
        loop = asyncio.get_event_loop()
        future = asyncio.ensure_future(
            _download_bridge_candidates(
                secret_string_cn,
                secret_string_global,
                downloaded_activity,
                is_only_running,
                options.latest_count,
                options.global_compare_count,
                options.bridge_only,
            )
        )
        loop.run_until_complete(future)
        new_ids, id2title = future.result()
    else:
        loop = asyncio.get_event_loop()
        future = asyncio.ensure_future(
            download_new_activities(
                secret_string_cn,
                auth_domain,
                downloaded_activity,
                is_only_running,
                folder,
                "fit",
            )
        )
        loop.run_until_complete(future)
        new_ids, id2title = future.result()

    to_upload_files = []
    for i in new_ids:
        if os.path.exists(os.path.join(FIT_FOLDER, f"{i}.fit")):
            # upload fit files
            to_upload_files.append(os.path.join(FIT_FOLDER, f"{i}.fit"))
        elif os.path.exists(os.path.join(GPX_FOLDER, f"{i}.gpx")):
            # upload gpx files which are manually uploaded to garmin connect
            to_upload_files.append(os.path.join(GPX_FOLDER, f"{i}.gpx"))

    print("Files to sync:" + " ".join(to_upload_files))
    # FIXME is com ok here?
    garmin_global_client = Garmin(
        secret_string_global,
        "COM",
        is_only_running,
    )
    loop = asyncio.get_event_loop()
    future = asyncio.ensure_future(
        garmin_global_client.upload_activities_files(to_upload_files)
    )
    loop.run_until_complete(future)

    if options.bridge_only:
        sys.exit(0)

    # Step 2:
    # Generate track from fit/gpx file
    make_activities_file(
        SQL_FILE, GPX_FOLDER, JSON_FILE, file_suffix="gpx", activity_title_dict=id2title
    )
    make_activities_file(
        SQL_FILE, FIT_FOLDER, JSON_FILE, file_suffix="fit", activity_title_dict=id2title
    )

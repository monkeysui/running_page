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
    source_secret_string,
    target_secret_string,
    source_domain,
    target_domain,
    source_label,
    target_label,
    downloaded_activity,
    is_only_running,
    latest_count,
    target_compare_count,
    bridge_only,
):
    source_client = Garmin(source_secret_string, source_domain, is_only_running)
    target_client = Garmin(target_secret_string, target_domain, is_only_running)

    source_ids = await _get_candidate_ids(source_client, latest_count)
    to_check_ids = [activity_id for activity_id in source_ids if activity_id]
    to_check_ids = list(dict.fromkeys(to_check_ids))
    if downloaded_activity:
        to_check_ids = [
            activity_id
            for activity_id in to_check_ids
            if activity_id not in set(downloaded_activity)
        ]

    print(f"{len(to_check_ids)} Garmin {source_label} activities to compare")

    target_activities = await target_client.get_activities(0, target_compare_count)
    new_ids = []
    id2title = {}

    for activity_id in to_check_ids:
        try:
            source_summary = await source_client.get_activity_summary(activity_id)
        except Exception as e:
            print(
                f"Failed to get Garmin {source_label} activity summary "
                f"{activity_id}: {str(e)}"
            )
            continue

        if any(_is_same_activity(source_summary, item) for item in target_activities):
            print(f"Skip {activity_id}: already exists in Garmin {target_label}")
            if bridge_only:
                marker_path = os.path.join(FIT_FOLDER, f"{activity_id}.synced")
                with open(marker_path, "a", encoding="utf-8"):
                    pass
            continue

        activity_title = source_summary.get("activityName", "")
        id2title[activity_id] = activity_title
        new_ids.append(activity_id)

    print(
        f"{len(new_ids)} new Garmin {source_label} activities to bridge "
        f"to Garmin {target_label}"
    )
    await asyncio.gather(
        *[
            download_garmin_data(source_client, activity_id, file_type="fit")
            for activity_id in new_ids
        ]
    )

    await source_client.req.aclose()
    await target_client.req.aclose()
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
        "--target-compare-count",
        dest="target_compare_count",
        type=int,
        default=200,
        help="number of recent target activities used for duplicate checks",
    )
    parser.add_argument(
        "--skip-existing-global",
        "--skip-existing-target",
        dest="skip_existing_target",
        action="store_true",
        help="skip source activities that already look present in the target account",
    )
    parser.add_argument(
        "--bridge-only",
        dest="bridge_only",
        action="store_true",
        help="only bridge Garmin accounts; do not regenerate local page data",
    )
    options = parser.parse_args()
    secret_string_cn = options.cn_secret_string
    secret_string_global = options.global_secret_string
    is_only_running = options.only_run
    if secret_string_cn is None or secret_string_global is None:
        print("Missing argument nor valid configuration file")
        sys.exit(1)

    source_secret_string = secret_string_cn
    target_secret_string = secret_string_global
    source_domain = "CN"
    target_domain = "COM"
    source_label = "CN"
    target_label = "Global"

    print(f"Bridge direction: Garmin {source_label} -> Garmin {target_label}")

    # load synced activity list
    downloaded_fit = get_downloaded_ids(FIT_FOLDER)
    downloaded_gpx = get_downloaded_ids(GPX_FOLDER)
    downloaded_activity = list(set(downloaded_fit + downloaded_gpx))

    folder = FIT_FOLDER
    # make gpx or tcx dir
    if not os.path.exists(folder):
        os.mkdir(folder)

    if options.skip_existing_target or options.latest_count:
        loop = asyncio.get_event_loop()
        future = asyncio.ensure_future(
            _download_bridge_candidates(
                source_secret_string,
                target_secret_string,
                source_domain,
                target_domain,
                source_label,
                target_label,
                downloaded_activity,
                is_only_running,
                options.latest_count,
                options.target_compare_count,
                options.bridge_only,
            )
        )
        loop.run_until_complete(future)
        new_ids, id2title = future.result()
    else:
        loop = asyncio.get_event_loop()
        future = asyncio.ensure_future(
            download_new_activities(
                source_secret_string,
                source_domain,
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
    target_client = Garmin(
        target_secret_string,
        target_domain,
        is_only_running,
    )
    loop = asyncio.get_event_loop()
    future = asyncio.ensure_future(
        target_client.upload_activities_files(to_upload_files)
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

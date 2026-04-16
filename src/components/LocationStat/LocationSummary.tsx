import Stat from '@/components/Stat';
import useActivities from '@/hooks/useActivities';

// only support China for now
const LocationSummary = () => {
  const { years, countries, provinces, cities } = useActivities();
  return (
    <div className="cursor-pointer">
      <section>
        {years ? (
          <Stat value={`${years.length}`} description=" years of running" />
        ) : null}
        {countries ? (
          <Stat value={countries.length} description=" countries" />
        ) : null}
        {provinces ? (
          <Stat value={provinces.length} description=" provinces" />
        ) : null}
        {cities ? (
          <Stat value={Object.keys(cities).length} description=" cities" />
        ) : null}
      </section>
      <hr />
    </div>
  );
};

export default LocationSummary;

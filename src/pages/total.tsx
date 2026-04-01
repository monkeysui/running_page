import ActivityList from '@/components/ActivityList';
import Header from '@/components/Header';
import { Helmet } from 'react-helmet-async';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useTheme } from '@/hooks/useTheme';
import { useEffect } from 'react';

const HomePage = () => {
  const { siteTitle, description } = useSiteMetadata();
  const { theme } = useTheme();

  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <Helmet>
        <html lang="en" data-theme={theme} />
        <title>{siteTitle}</title>
        <meta name="description" content={description} />
      </Helmet>
      <Header />
      <ActivityList />
    </>
  );
};

export default HomePage;

import SettingsTabs from "./settings-tabs";

const SettingsPage = async ({
  searchParams,
}: PageProps<"/dashboard/settings">) => {
  const { tab } = await searchParams;
  const defaultTab = Array.isArray(tab) ? tab[0] : tab;
  return <SettingsTabs defaultTab={defaultTab} />;
};

export default SettingsPage;

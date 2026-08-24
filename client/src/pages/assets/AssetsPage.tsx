import { Home } from 'lucide-react';
import PortfolioSectionPage from '@/features/portfolio/PortfolioSectionPage';

const AssetsPage = () => (
  <PortfolioSectionPage
    kind="asset"
    title="Assets"
    singular="asset"
    description="Things the family owns that hold value."
    icon={Home}
  />
);

export default AssetsPage;

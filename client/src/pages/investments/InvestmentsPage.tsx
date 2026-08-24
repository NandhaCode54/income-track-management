import { TrendingUp } from 'lucide-react';
import PortfolioSectionPage from '@/features/portfolio/PortfolioSectionPage';

const InvestmentsPage = () => (
  <PortfolioSectionPage
    kind="investment"
    title="Investments"
    singular="investment"
    description="Track what you have invested and what it is worth today."
    icon={TrendingUp}
  />
);

export default InvestmentsPage;

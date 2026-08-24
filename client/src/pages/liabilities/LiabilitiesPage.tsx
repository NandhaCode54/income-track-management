import { CreditCard } from 'lucide-react';
import PortfolioSectionPage from '@/features/portfolio/PortfolioSectionPage';

const LiabilitiesPage = () => (
  <PortfolioSectionPage
    kind="liability"
    title="Liabilities"
    singular="liability"
    description="What is owed — loans, card dues, borrowings."
    icon={CreditCard}
  />
);

export default LiabilitiesPage;

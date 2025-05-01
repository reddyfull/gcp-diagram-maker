import React from 'react';
import WizardSummary from './WizardSummary';
import { useWizard } from '../../pages/wizard/WizardContext';

const WizardSummaryWrapper: React.FC = () => {
  const { answers } = useWizard();
  
  return <WizardSummary answers={answers} />;
};

export default WizardSummaryWrapper; 
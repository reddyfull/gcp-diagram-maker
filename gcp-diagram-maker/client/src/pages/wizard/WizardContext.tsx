import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of our context
interface WizardContextType {
  answers: Record<string, any>;
  updateAnswers: (newAnswers: Record<string, any>) => void;
  resetAnswers: () => void;
}

// Create the context with a default undefined value
const WizardContext = createContext<WizardContextType | undefined>(undefined);

// Provider component that wraps the wizard components
interface WizardProviderProps {
  children: ReactNode;
}

export const WizardProvider: React.FC<WizardProviderProps> = ({ children }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Update the answers by merging the new answers with the existing ones
  const updateAnswers = (newAnswers: Record<string, any>) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      ...newAnswers
    }));
  };

  // Reset all answers
  const resetAnswers = () => {
    setAnswers({});
  };

  // Value object that will be passed to consuming components
  const value = {
    answers,
    updateAnswers,
    resetAnswers
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};

// Custom hook to use the WizardContext
export const useWizard = (): WizardContextType => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};

export default WizardContext; 
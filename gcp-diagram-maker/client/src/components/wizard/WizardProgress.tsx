import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  useTheme,
  useMediaQuery,
  MobileStepper,
  Button,
  Typography,
} from '@mui/material';
import {
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
} from '@mui/icons-material';

// Define wizard steps
export interface WizardStep {
  label: string;
  path: string;
  completed?: boolean;
}

// Define component props
interface WizardProgressProps {
  activeStep: number;
  onStepClick?: (step: number) => void;
  disableNavigation?: boolean;
}

// Create default wizard steps
const defaultSteps: WizardStep[] = [
  { label: 'Provider', path: '/wizard' },
  { label: 'Region', path: '/wizard/regions' },
  { label: 'Services', path: '/wizard/services' },
  { label: 'Configure', path: '/wizard/configure' },
  { label: 'Review', path: '/wizard/review' },
];

const WizardProgress = ({
  activeStep,
  onStepClick,
  disableNavigation = false,
}: WizardProgressProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  // Handle step click
  const handleStepClick = (index: number) => {
    if (disableNavigation) return;

    if (onStepClick) {
      onStepClick(index);
    } else {
      // Default navigation behavior if no custom handler provided
      navigate(defaultSteps[index].path);
    }
  };

  // Render desktop stepper
  const renderDesktopStepper = () => (
    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
      {defaultSteps.map((step, index) => {
        const stepProps: { completed?: boolean } = {};
        if (step.completed) stepProps.completed = true;

        return (
          <Step key={step.label} {...stepProps}>
            <StepButton
              onClick={() => handleStepClick(index)}
              disabled={disableNavigation || index > activeStep}
            >
              {step.label}
            </StepButton>
          </Step>
        );
      })}
    </Stepper>
  );

  // Render mobile stepper
  const renderMobileStepper = () => (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        align="center" 
        sx={{ mb: 1 }}
      >
        Step {activeStep + 1} of {defaultSteps.length}: {defaultSteps[activeStep].label}
      </Typography>
      <MobileStepper
        variant="dots"
        steps={defaultSteps.length}
        position="static"
        activeStep={activeStep}
        sx={{ 
          bgcolor: 'background.paper',
          borderRadius: 1,
          '& .MuiMobileStepper-dot': {
            mx: 0.5,
          },
        }}
        nextButton={
          <Button
            size="small"
            onClick={() => handleStepClick(activeStep + 1)}
            disabled={activeStep === defaultSteps.length - 1 || disableNavigation}
          >
            Next
            <KeyboardArrowRightIcon />
          </Button>
        }
        backButton={
          <Button
            size="small"
            onClick={() => handleStepClick(activeStep - 1)}
            disabled={activeStep === 0 || disableNavigation}
          >
            <KeyboardArrowLeftIcon />
            Back
          </Button>
        }
      />
    </Box>
  );

  return (
    <>
      {isMobile ? renderMobileStepper() : renderDesktopStepper()}
    </>
  );
};

export default WizardProgress; 
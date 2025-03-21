import { Step, StepLabel, Stepper } from '@mui/material'
import React from 'react'

interface IClickableStepperProps {
  numberOfSteps: number
  activeStep: number
  setActiveStep: (step: number) => void
  contents: JSX.Element[]
}

const ClickableStepper: React.FC<IClickableStepperProps> = ({
  numberOfSteps,
  activeStep,
  setActiveStep,
  contents,
}) => {
  const handleStepClick = (index: number) => {
    setActiveStep(index)
  }

  return (
    <>
      <Stepper activeStep={activeStep} alternativeLabel nonLinear>
        {Array.from({ length: numberOfSteps }).map((_, index) => (
          <Step key={index} onClick={() => handleStepClick(index)}>
            <StepLabel />
          </Step>
        ))}
      </Stepper>
      <div>{contents[activeStep]}</div>
    </>
  )
}

export default ClickableStepper

import { ArrowRight, Check, Circle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface WorkflowStep {
  id: string
  label: string
  description: string
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'discovery', label: 'Discovery', description: 'Find & explore feeds' },
  { id: 'validator', label: 'Validate', description: 'Check feed integrity' },
  { id: 'archive', label: 'Archive', description: 'Save feed snapshot' },
  { id: 'submit', label: 'Submit', description: 'Publish to directory' },
  { id: 'rag', label: 'RAG Prep', description: 'Prepare for AI' },
]

interface WorkflowStepperProps {
  currentStep: string
  onStepClick: (stepId: string) => void
  completedSteps?: string[]
}

export function WorkflowStepper({ currentStep, onStepClick, completedSteps = [] }: WorkflowStepperProps) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="glass-card rounded-2xl p-4 mb-8">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 px-2">
        <span className="font-semibold uppercase tracking-wider">Recommended Workflow</span>
        <span className="text-primary/80">Step {currentIndex + 1} of {WORKFLOW_STEPS.length}</span>
      </div>
      
      <div className="flex items-center justify-between">
        {WORKFLOW_STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isCompleted = completedSteps.includes(step.id)
          const isPast = index < currentIndex
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => onStepClick(step.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 min-w-[80px]",
                  "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50",
                  isActive && "bg-primary/15"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                    isCompleted && "bg-green-500 text-white",
                    !isActive && !isCompleted && isPast && "bg-muted text-muted-foreground",
                    !isActive && !isCompleted && !isPast && "bg-muted/50 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <Check size={16} weight="bold" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive && "text-primary",
                    isCompleted && "text-green-600 dark:text-green-400",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </button>
              
              {index < WORKFLOW_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 transition-colors duration-300",
                    (isPast || isCompleted) ? "bg-primary/50" : "bg-muted"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface NextStepButtonProps {
  currentStep: string
  onNavigate: (stepId: string) => void
  disabled?: boolean
  className?: string
}

export function NextStepButton({ currentStep, onNavigate, disabled, className }: NextStepButtonProps) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep)
  const nextStep = WORKFLOW_STEPS[currentIndex + 1]

  if (!nextStep) return null

  return (
    <button
      onClick={() => onNavigate(nextStep.id)}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
        "bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm",
        "transition-all duration-200 hover:gap-3",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:gap-2",
        className
      )}
    >
      Next: {nextStep.label}
      <ArrowRight size={16} weight="bold" />
    </button>
  )
}

export { WORKFLOW_STEPS }

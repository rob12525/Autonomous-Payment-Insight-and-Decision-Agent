# Module3

A comprehensive Python framework for safe action execution with learning capabilities.

## Overview

Module3 provides a robust system for executing actions with built-in safety guardrails, automatic rollback mechanisms, outcome tracking, and continuous learning from execution results.

## Features

- **Safety Guardrails**: Validate actions before execution to prevent dangerous operations
- **Action Execution**: Execute actions with proper error handling and timing
- **Rollback Management**: Automatically rollback failed actions
- **Outcome Tracking**: Monitor and assess execution results
- **Learning System**: Extract knowledge and lessons from action outcomes

## Installation

1. Clone the repository
2. Run the setup script:
   ```bash
   ./setup.sh
   ```
3. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```

## Usage

### Simple Example

```python
import asyncio
from module3.models.decision import Decision
from module3.components.safety_guardrails import SafetyGuardrails
from module3.components.action_executor import ActionExecutor

async def run():
    # Initialize components
    guardrails = SafetyGuardrails()
    executor = ActionExecutor(simulation_mode=True)

    # Register a handler for demo purposes
    executor.register_handler("greet", lambda params: f"Hello, {params['name']}!")

    # Create a Decision (in production this would be provided by Module 2 or a human operator)
    decision = Decision(
        action_id="1",
        action_type="do_nothing",
        target_dimension="none",
        target_value="none",
        parameters={},
        duration_minutes=0,
        expected_improvement_pct=0.0,
        estimated_risk_level="low",
        reasoning="Example",
        confidence=0.5
    )

    is_valid, violations = guardrails.validate_action(decision)
    if is_valid:
        outcome = await executor.execute_action(decision, current_state={})
        print(f"Result: {outcome.get('status')}")

if __name__ == '__main__':
    asyncio.run(run())
```

### Running the Demo

```bash
python main.py
```

## Project Structure

```
module3/
├── models/                      # Data models
│   ├── decision.py             # Decision model (replaces Action) 
│   ├── outcome.py              # ActionOutcome model
│   └── learning.py             # LearningEntry model
├── components/                  # Core components
│   ├── safety_guardrails.py    # Safety validation
│   ├── action_executor.py      # Action execution
│   ├── rollback_manager.py     # Automatic rollback
│   ├── outcome_tracker.py      # Outcome assessment
│   └── learning_system.py      # Knowledge extraction
├── config/                      # Configuration
│   └── module3.yaml            # Main configuration file
├── tests/                       # Test suite
│   ├── test_safety.py          # Safety guardrails tests
│   └── test_executor.py        # Executor tests
├── examples/                    # Usage examples
│   └── simple_usage.py         # Simple example
├── main.py                      # Main demo/entry point
├── requirements.txt             # Python dependencies
├── setup.sh                     # Setup script
├── .env.example                 # Environment template
└── README.md                    # Complete documentation
```

## Configuration

Edit `config/module3.yaml` to customize:
- Safety settings
- Execution parameters
- Learning thresholds
- Logging configuration

## Testing

Run tests with:
```bash
pytest tests/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.</content>
<parameter name="filePath">c:\Users\merch\Documents\uni\cyber cypher\module3\README.md
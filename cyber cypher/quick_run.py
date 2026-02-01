import asyncio
from main import PaymentOpsAgent

async def run():
    agent = PaymentOpsAgent(simulation_mode=True)
    # shorten observation window for quick demo
    agent.rollback_manager.OBSERVATION_WINDOW_MIN = 0.01
    await agent.run_agent_loop(num_iterations=1)

if __name__ == '__main__':
    asyncio.run(run())

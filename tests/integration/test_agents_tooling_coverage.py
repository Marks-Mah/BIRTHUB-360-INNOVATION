from pathlib import Path


def test_each_agent_has_at_least_ten_tools():
    tools_files = sorted(Path('agents').glob('*/tools.py'))
    assert tools_files, 'Nenhum arquivo tools.py encontrado em agents/'

    shortages = []
    for file in tools_files:
        tool_count = sum(1 for line in file.read_text().splitlines() if line.startswith('async def '))
        if tool_count < 10:
            shortages.append((file.as_posix(), tool_count))

    assert not shortages, f'Agentes com menos de 10 ferramentas: {shortages}'

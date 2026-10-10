import json
from pathlib import Path

p = Path(__file__).parent / "events.json"
data = json.loads(p.read_text())
assert data["schemaVersion"] == "real-event-backdrops.v1"
assert data["asOf"] == "2026-10-10"
rules = data["integrationRules"]
assert rules["preserveOfficialWeatherReplay"] is True
assert rules["newsAutomaticallyChangesModel"] is False
assert rules["parametersRequireExplicitUserSelection"] is True
assert rules["defaultAdditionalDelayDays"] == 0
assert rules["eventFactsTrainLearner"] is False
assert rules["automaticExecution"] is False
events = data["events"]
assert len(events) == 4 and len({e["id"] for e in events}) == 4
for e in events:
    sources = {s["id"] for s in e["sources"]}
    assert sources
    for f in e["facts"]:
        assert f["text"] and set(f["sourceIds"]).issubset(sources)
    for s in e["sources"]:
        assert s["url"].startswith("https://") and s["checkedAt"].endswith("Z")
    assert e["exposure"]["kind"] == "hypothetical"
    assert e["parameterBridge"]["automaticCalibration"] is False
    if e["simulationMode"] == "strategic_context_only":
        assert e["id"] == "kimi-funding-2026"
        assert e["parameterBridge"]["kind"] == "context_only"
        assert e["parameterBridge"]["parameters"] == []
    else:
        params = e["parameterBridge"]["parameters"]
        assert e["parameterBridge"]["kind"] == "user_selected_assumptions"
        assert len(params) == 1
        delay = params[0]
        assert delay["id"] == "additional_arrival_delay_days"
        assert (delay["baseline"], delay["min"], delay["max"]) == (0, 0, 5)
        assert delay["choices"] == list(range(6))
        assert delay["modelField"] == "state.orders[id=DEMO_SHIP01].reported_arrival_day"
print(json.dumps({"contract": "passed", "cards": 4, "retail_delay_cards": 3, "strategic_cards": 1}))

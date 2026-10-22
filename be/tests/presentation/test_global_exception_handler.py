class Broken:
    def match(self, request, catalog):
        raise RuntimeError("đứt cáp")


def test_malformed_json_is_a_bad_request_with_the_message_the_frontend_shows(client_for):
    response = client_for().post("/api/v1/lite-spec", content=b"{not json", headers={"Content-Type": "application/json"})

    assert response.status_code == 400
    assert response.json() == {"status": 400, "error": "Bad Request", "message": "JSON không hợp lệ hoặc sai kiểu dữ liệu."}


def test_a_field_that_breaks_a_rule_is_named_in_the_message(client_for):
    response = client_for().post("/api/v1/lite-spec", json={"request": "x" * 3001})

    assert response.status_code == 400
    assert response.json()["message"].startswith("request: ")


def test_an_unexpected_error_is_an_internal_error_with_its_message_and_a_timestamp(client_for):
    response = client_for(experiment_match_agent=Broken()).post("/api/v1/experiment-match", json={"request": "x", "catalog": [{"id": "a", "grade": 10}]})

    assert response.status_code == 500
    body = response.json()
    assert (body["status"], body["error"], body["message"]) == (500, "Internal Server Error", "đứt cáp")
    assert body["timestamp"]


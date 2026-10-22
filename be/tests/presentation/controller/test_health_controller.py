from beneviadsystem.domain.model.application_health import ApplicationHealth


class Health:
    def get_health(self):
        return ApplicationHealth("UP", "be-neviad-system")


def test_returns_healthy_service_payload(client_for):
    response = client_for(health_service=Health()).get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "UP", "service": "be-neviad-system"}


def test_the_security_headers_of_the_old_backend_are_kept(client_for):
    response = client_for().get("/api/health")

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_cors_lets_the_frontend_origin_in_with_credentials(client_for):
    response = client_for().options("/api/health", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert response.headers["access-control-allow-credentials"] == "true"
    assert client_for().options("/api/health", headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"}).status_code == 400

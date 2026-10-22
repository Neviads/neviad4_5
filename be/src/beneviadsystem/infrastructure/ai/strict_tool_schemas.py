from __future__ import annotations

from typing import Any


class StrictToolSchemas:
    """Makes a JSON schema acceptable for OpenAI strict function calling: every object closes ``additionalProperties`` and lists all of
    its properties as required, recursively (array items and anyOf/oneOf/allOf branches included)."""

    @staticmethod
    def strictify(schema: Any) -> None:
        if not isinstance(schema, dict):
            return
        properties = schema.get("properties")
        if schema.get("type") == "object" or isinstance(properties, dict):
            schema["additionalProperties"] = False
            if isinstance(properties, dict):
                schema["required"] = list(properties.keys())
                for value in properties.values():
                    StrictToolSchemas.strictify(value)
        if schema.get("items") is not None:
            StrictToolSchemas.strictify(schema["items"])
        if schema.get("additionalItems") is not None:
            StrictToolSchemas.strictify(schema["additionalItems"])
        for branch in ("anyOf", "oneOf", "allOf", "prefixItems"):
            branches = schema.get(branch)
            if isinstance(branches, list):
                for item in branches:
                    StrictToolSchemas.strictify(item)

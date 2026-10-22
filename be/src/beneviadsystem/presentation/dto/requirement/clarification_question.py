from beneviadsystem.domain.model.base import CamelModel, Text, TextList


class ClarificationQuestion(CamelModel):
    topic: Text = ""
    text: Text = ""
    suggestions: TextList = []

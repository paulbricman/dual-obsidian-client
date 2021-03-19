from core import Core
import re


class ConversationalWrapper:
    def __init__(self, root_dir):
        self.core = Core(root_dir)
        
    def respond(self, query):
        query = query.strip()

        if query == '':
            return None

        if '?' in query:
            return {
                'intent': 'QUESTION_ANSWERING',
                'content': self.core.question_answering(query)
            }
        elif re.match(r'.*([Tt]his\s+(text|note|entry)).*', query.lower()):
            return {
                'intent': 'DESCRIPTIVE_SEARCH',
                'content': self.core.descriptive_search(query)
            }
        elif m := re.match(r'.*(([Ss]earch\s+for|[Ll]ook\s+for|[Ff]ind)\s+(a\s+text|a\s+note|an\s+entry)\s+(that|which))\s+(.*)', query):
            return {
                'intent': 'DESCRIPTIVE_SEARCH',
                'content': self.core.descriptive_search('This text ' + m.group(5))
            }
        elif m := re.match(r'.*(([Aa]sk|[Qq]uiz|[Tt]est)\s+me\s+(on|about))\s+([^\.]*)', query):
            return {
                'intent': 'QUESTION_GENERATION',
                'content': self.core.question_generation(m.group(4))
            }
        else:
            if m:= re.match(r'.*(([Ss]earch\s+for|[Ll]ook\s+for|[Ll]ook\s+up|[Ff]ind)\s*(a\s+note|an\s+entry|a\s+text|notes|entries|texts)?\s*(on|about|related\s+to)?)\s+([^\.]*)', query):
                query = m.group(5)
            return {
                'intent': 'FLUID_SEARCH',
                'content': self.core.fluid_search(query)
            }

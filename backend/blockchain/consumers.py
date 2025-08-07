from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Authenticate the user
        try:
            token = self.scope['query_string'].decode().split('token=')[1]
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            self.scope['user'] = await database_sync_to_async(self.get_user)(user_id)
            await self.accept()
        except Exception as e:
            await self.close(code=4001)  # Unauthorized

    async def disconnect(self, close_code):
        # Cleanup logic (if needed)
        pass

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event))

    def get_user(self, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()
from django.urls import re_path
from .consumers import NotificationConsumer
from channels.auth import AuthMiddlewareStack

websocket_urlpatterns = [
    re_path(r'ws/notifications/(?P<user_id>\w+)/$', AuthMiddlewareStack(NotificationConsumer.as_asgi())),
]
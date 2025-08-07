import os
from celery import Celery, shared_task
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Configure task retries and timeouts
app.conf.task_default_retry_delay = 30  # Retry after 30 seconds
app.conf.task_time_limit = 300  # Task timeout after 5 minutes
app.conf.task_soft_time_limit = 240  # Soft timeout after 4 minutes

# Optional: Configure periodic tasks
app.conf.beat_schedule = {
    'listen-for-events': {
        'task': 'blockchain.tasks.listen_for_events',
        'schedule': crontab(minute='*/1'),  # Run every minute
    },
}

app.autodiscover_tasks()

# Configure logging
@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
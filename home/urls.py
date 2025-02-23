from django.urls import path
from . import views
from .views import FetchGameView

urlpatterns = [
    path('', views.index, name='index'),
    path('contact/', views.contact, name='contact'),
    path('about/', views.about, name='about'),
    path('fetch_game/', FetchGameView.as_view(), name='fetch_game'),
]

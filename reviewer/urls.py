from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path("analyze_pgn/", views.analyze_pgn, name="analyze_pgn"),
]

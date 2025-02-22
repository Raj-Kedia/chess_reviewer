from django.urls import path
from . import views
from .views import AnalyzePGNView

urlpatterns = [
    path('', views.index, name='index'),
    path('analyze_pgn/', AnalyzePGNView.as_view(), name='analyze_pgn'),
]

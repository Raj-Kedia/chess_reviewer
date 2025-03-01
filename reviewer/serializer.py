from rest_framework import serializers
from .models import MoveAnalysis


class MoveAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoveAnalysis
        fields = '__all__'

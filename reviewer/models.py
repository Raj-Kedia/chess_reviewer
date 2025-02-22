from django.db import models


class MoveAnalysis(models.Model):
    move_number = models.IntegerField()
    move = models.CharField(max_length=50)
    loss = models.FloatField()  # Store evaluation details
    best_move = models.CharField(max_length=50)
    classification = models.TextField()
    opening_name = models.TextField()
    # Required for CursorPagination
    created_at = models.DateTimeField(auto_now_add=True)

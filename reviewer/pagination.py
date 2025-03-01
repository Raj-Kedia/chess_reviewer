
from rest_framework.pagination import CursorPagination


class MoveCursorPagination(CursorPagination):
    page_size = 10
    ordering = "id"

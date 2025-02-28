from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import *
from .serializer import *
from django.db import connection
from .engine import *
from .pagination import *
from .prase_pgn import *
from .analyze import *
import atexit


def cleanup_engine():
    if engine is not None:
        engine.quit()


def index(request):
    return render(request, 'reviewer/reviewer.html')


@method_decorator(csrf_exempt, name='dispatch')
class AnalyzePGNView(APIView):
    """Handles PGN analysis and returns move classifications."""
    pagination_class = MoveCursorPagination

    def post(self, request):
        """Processes PGN input and returns analysis with move classifications."""
        try:
            data = request.data
            pgn_string = cursor = None
            depthValue = 15
            if data.get("pgn"):
                pgn_string = data.get("pgn", "").strip()
            if data.get('depth'):
                depthValue = data.get('depth', 0)
            if data.get("cursor", ''):
                cursor = data.get("cursor", '').strip()
            if not pgn_string and not cursor:
                return Response({"error": "PGN data missing"}, status=status.HTTP_400_BAD_REQUEST)
            # Parse PGN
            if pgn_string:
                MoveAnalysis.objects.all().delete()

                with connection.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM sqlite_sequence WHERE name='reviewer_moveanalysis';")

                metadata, moves = parse_pgn(pgn_string)

                # Process moves
                analysis, results = analyze_pgn(moves, metadata, depthValue)
                # Paginate response

                for idx, move_data in enumerate(analysis):
                    MoveAnalysis.objects.create(
                        move_number=idx,
                        move=move_data['m'],
                        loss=move_data['loss'],
                        best_move=move_data['bm'],
                        opening_name=move_data['op'],
                        classification=move_data['class']
                    )
                # Paginate using a QuerySet instead of a list
                paginator = self.pagination_class()
                queryset = MoveAnalysis.objects.all().order_by(
                    "id")  # Ensure ordering
                result_page = paginator.paginate_queryset(queryset, request)

                return paginator.get_paginated_response({
                    "result": results,
                    "analysis": MoveAnalysisSerializer(result_page, many=True).data,
                })
            else:
                paginator = self.pagination_class()
                queryset = MoveAnalysis.objects.all().order_by("id")
                result_page = paginator.paginate_queryset(queryset, request)

                return paginator.get_paginated_response({
                    "analysis": MoveAnalysisSerializer(result_page, many=True).data,
                })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


atexit.register(cleanup_engine)

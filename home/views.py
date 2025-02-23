from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import requests
import json


def index(request):
    return render(request, 'home/home.html')


def contact(request):
    return render(request, 'home/contact.html')


def about(request):
    return render(request, 'home/about.html')


@method_decorator(csrf_exempt, name='dispatch')
class FetchGameView(APIView):
    """Handles PGN analysis and returns move classifications with manual pagination."""

    def post(self, request):
        try:
            data = request.data
            username = data.get('username', '').strip()
            platform = data.get('platform', '').strip()
            cursor = data.get('cursor', 0)
            print(username, platform, cursor)
            game_list = []
            if not username or platform not in ["Chess.com", "Lichess.org"]:
                return Response({"error": "Invalid username or platform"}, status=status.HTTP_400_BAD_REQUEST)

            cursor_timestamp = cursor

            if platform == "Chess.com":
                archive_url = f"https://api.chess.com/pub/player/{username}/games/archives"
                headers = {"User-Agent": "Mozilla/5.0"}

                # Fetch archive URLs
                archive_response = requests.get(archive_url, headers=headers)
                if archive_response.status_code == 403:
                    return Response({"error": "403 Forbidden: The user's games might be private or API blocked."}, status=status.HTTP_403_FORBIDDEN)

                try:
                    archive_data = archive_response.json()
                    archives = archive_data.get("archives", [])
                    if not archives:
                        return Response({"error": "No game archives found."}, status=status.HTTP_404_NOT_FOUND)
                except ValueError:
                    return Response({"error": "Invalid JSON response from Chess.com"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                i = 1
                while len(game_list) < 20 and i <= len(archives):
                    latest_archive = archives[-i]

                    try:
                        games_response = requests.get(
                            latest_archive, headers=headers)
                        games_response.raise_for_status()
                        games_data = games_response.json()
                    except (requests.exceptions.RequestException, ValueError):
                        return Response({"error": "Failed to fetch or parse game data."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                    games = games_data.get("games", [])

                    for game in games:
                        if cursor_timestamp and int(game.get("end_time", 0)) >= int(cursor_timestamp):
                            continue  # Skip already loaded games

                        game_list.append(game)
                        if len(game_list) >= 20:
                            break
                    i += 1
                game_list = sorted(game_list, key=lambda x: x.get(
                    "end_time", 0), reverse=True)  # Sort by newest

            elif platform == "Lichess.org":
                lichess_url = f"https://lichess.org/api/games/user/{username}"
                headers = {"Accept": "application/json",
                           "User-Agent": "Mozilla/5.0"}

                params = {
                    "max": 20,  # Fetch more than needed to allow filtering
                    "moves": True,
                    "pgnInJson": True,
                    "analysed": False,
                }
                if cursor_timestamp:
                    # Lichess uses `until` for pagination
                    params["until"] = cursor_timestamp

                try:
                    response = requests.get(
                        lichess_url, headers=headers, params=params)
                    response.raise_for_status()
                except requests.exceptions.RequestException as e:
                    return Response({"error": f"Failed to fetch Lichess games: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                try:
                    games_data = [json.loads(
                        line) for line in response.text.strip().split("\n")]
                except ValueError:
                    return Response({"error": "Invalid JSON response from Lichess.org"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                for game in games_data:
                    if cursor_timestamp and int(game.get("end_time", 0)) >= int(cursor_timestamp):
                        continue  # Skip already loaded games
                    game_list.append(game)

                game_list = sorted(game_list, key=lambda x: x.get(
                    "createdAt", 0), reverse=True)  # Sort by newest
                if not game_list:
                    return Response({"error": "No more games available."}, status=status.HTTP_404_NOT_FOUND)

            page_size = 20
            paginated_games = []
            next_cursor = None
            for game in game_list:
                if len(paginated_games) < page_size:
                    paginated_games.append(game)
                    # Use end_time as cursor
                    next_cursor = game.get("createdAt", 0)
                else:
                    break

            return Response({
                "results": paginated_games,
                "next_cursor": next_cursor  # Send cursor for next request
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

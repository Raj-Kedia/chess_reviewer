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
    """Fetches games from Chess.com or Lichess.org with correct pagination"""

    def post(self, request):
        try:
            data = request.data
            username = data.get('username', '').strip()
            platform = data.get('platform', '').strip()
            # Cursor represents the last fetched game's timestamp
            cursor = int(data.get('cursor', 0))
            print(data, cursor)
            if not username or platform not in ["Chess.com", "Lichess.org"]:
                return Response({"error": "Invalid username or platform"}, status=status.HTTP_400_BAD_REQUEST)

            game_list = []
            new_cursor = None  # This will store the next page cursor

            headers = {"User-Agent": "Mozilla/5.0"}

            if platform == "Chess.com":
                archive_url = f"https://api.chess.com/pub/player/{username}/games/archives"

                # Fetch archives (list of URLs for each month's games)
                archive_response = requests.get(archive_url, headers=headers)
                if archive_response.status_code != 200:
                    return Response({"error": "Chess.com API issue or private games."}, status=status.HTTP_400_BAD_REQUEST)

                archive_data = archive_response.json()
                archives = archive_data.get("archives", [])
                if not archives:
                    return Response({"error": "No game archives found."}, status=status.HTTP_404_NOT_FOUND)

                # Start from the most recent archive and work backward
                # Process from latest to oldest archive
                for archive in reversed(archives):
                    if len(game_list) >= 20:
                        break  # Stop once we collect 20 games

                    games_response = requests.get(archive, headers=headers)
                    if games_response.status_code != 200:
                        continue  # Skip if the archive fails

                    games_data = games_response.json().get("games", [])
                    # Sort by latest first
                    games_data.sort(key=lambda x: int(
                        x.get("end_time", 0)), reverse=True)

                    for game in games_data:
                        end_time = int(game.get("end_time", 0))
                        print(end_time, cursor)
                        # Skip games already fetched
                        if cursor and end_time >= cursor:
                            print(cursor, end_time)
                            continue

                        game_list.append(game)
                        if len(game_list) == 20:
                            new_cursor = end_time  # Update cursor to the last game's timestamp
                            break

                if not new_cursor and game_list:
                    new_cursor = game_list[-1].get("end_time", 0)

            elif platform == "Lichess.org":
                game_list.clear()
                lichess_url = f"https://lichess.org/api/games/user/{username}"
                params = {
                    "max": 20,  # Limit to 20 games per request
                    "moves": True,
                    "pgnInJson": True,
                    "analysed": False,
                }

                if cursor:
                    # Fetch games before this timestamp
                    params["until"] = cursor

                headers = {"Accept": "application/json",
                           "User-Agent": "Mozilla/5.0"}
                response = requests.get(
                    lichess_url, headers=headers, params=params)

                if response.status_code != 200:
                    return Response({"error": "Invalid username or private username."}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    games_data = [json.loads(
                        line) for line in response.text.strip().split("\n")]
                except ValueError:
                    return Response({"error": "Invalid JSON response from Lichess.org"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                # Print fetched game timestamps for debugging
                print("Fetched games timestamps:", [
                      game.get("createdAt", 0) for game in games_data])

                # Reverse order to get the most recent games first
                games_data.sort(key=lambda x: int(
                    x.get("createdAt", 0)), reverse=True)

                for game in games_data:
                    game_list.append(game)

                # Ensure cursor updates to the **oldest** game's timestamp
                if game_list:
                    new_cursor = game_list[-1].get("createdAt", 0)
                    print("New cursor (oldest game's timestamp):", new_cursor)

            print(len(game_list))
            return Response({
                "results": game_list,
                "next_cursor": new_cursor
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import requests
import json
from .models import *
import re
from django.http import JsonResponse
import os
from django.contrib import messages


def index(request):
    return render(request, 'home/home.html')


def contact(request):
    if request.method == "POST":
        name = request.POST['name']
        email = request.POST['email']
        phone = request.POST['phone']
        content = request.POST['content']
        if len(name) < 2 or len(email) < 3 or len(phone) < 10 or len(content) < 4:
            messages.error(request, "Please fill the form correctly")
        else:
            contact = Contact(name=name, email=email,
                              phone=phone, content=content)
            contact.save()
            messages.success(
                request, "Your message has been successfully sent")
    return render(request, "home/contact.html")


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
            cursor = int(data.get('cursor', 0))
            if not username or platform not in ["Chess.com", "Lichess.org"]:
                return Response({"error": "Invalid username or platform"}, status=status.HTTP_400_BAD_REQUEST)
            print('till now no error')
            game_list = []
            new_cursor = None

            headers = {"User-Agent": "Mozilla/5.0"}

            if platform == "Chess.com":
                archive_url = f"https://api.chess.com/pub/player/{username}/games/archives"

                archive_response = requests.get(archive_url, headers=headers)
                if archive_response.status_code != 200:
                    return Response({"error": "Invalid username or private username."}, status=status.HTTP_400_BAD_REQUEST)

                archive_data = archive_response.json()
                archives = archive_data.get("archives", [])
                if not archives:
                    return Response({"error": "No game found."}, status=status.HTTP_404_NOT_FOUND)

                for archive in reversed(archives):
                    if len(game_list) >= 20:
                        break

                    games_response = requests.get(archive, headers=headers)
                    if games_response.status_code != 200:
                        continue

                    games_data = games_response.json().get("games", [])
                    games_data.sort(key=lambda x: int(
                        x.get("end_time", 0)), reverse=True)

                    for game in games_data:
                        end_time = int(game.get("end_time", 0))
                        if cursor and end_time >= cursor:
                            continue

                        game_list.append(game)
                        if len(game_list) == 20:
                            new_cursor = end_time
                            break

                if not new_cursor and game_list:
                    new_cursor = game_list[-1].get("end_time", 0)

            elif platform == "Lichess.org":
                game_list.clear()
                lichess_url = f"https://lichess.org/api/games/user/{username}"
                params = {
                    "max": 20,
                    "moves": True,
                    "pgnInJson": True,
                    "analysed": False,
                }

                if cursor:
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
                    if len(games_data) == 0:
                        return Response({"error": "No game found"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                except ValueError:
                    return Response({"error": "Invalid JSON response from Lichess.org"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                games_data.sort(key=lambda x: int(
                    x.get("createdAt", 0)), reverse=True)

                for game in games_data:
                    game_list.append(game)

                if game_list:
                    new_cursor = game_list[-1].get("createdAt", 0)

            return Response({
                "results": game_list,
                "next_cursor": new_cursor
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

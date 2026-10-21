from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        user = authenticate(username=request.data.get('username'), password=request.data.get('password'))
        if not user:
            return Response({'error': 'Invalid credentials.'}, status=400)
        token, _ = Token.objects.get_or_create(user=user)
        org = None
        try:
            o = user.profile.organization
            if o: org = {'id': str(o.id), 'name': o.name, 'slug': o.slug}
        except Exception:
            pass
        return Response({'token': token.key, 'user': {'id': user.id, 'username': user.username, 'email': user.email, 'first_name': user.first_name, 'last_name': user.last_name}, 'organization': org})

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        org = None
        try:
            o = user.profile.organization
            if o: org = {'id': str(o.id), 'name': o.name, 'slug': o.slug}
        except Exception:
            pass
        return Response({'user': {'id': user.id, 'username': user.username, 'email': user.email, 'first_name': user.first_name, 'last_name': user.last_name}, 'organization': org})

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        request.user.auth_token.delete()
        return Response({'detail': 'Logged out.'})

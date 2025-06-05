from django.urls import path
from .views import UserRegistrationAPIView, UserLoginAPIView, UserLogoutAPIView, UserInfoAPIView
from rest_framework_simplejwt.views import TokenRefreshView

app_name = "accounts"

urlpatterns = [
    path('signup/', UserRegistrationAPIView.as_view(), name="user-signup"),
    path('login/', UserLoginAPIView.as_view(), name="user-login"),
    path('logout/', UserLogoutAPIView.as_view(), name="user-logout"),
    path('token/refresh/', TokenRefreshView.as_view(), name="token-refresh"),
    path('info/', UserInfoAPIView.as_view(), name="user-info"),
]

from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import redirect
import time


class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit = 20
        self.time_window = 60
    def __call__(self,request):
        ip = self.get_client_ip(request)
        path = request.path         #/login_view
        method = request.method     #GET, POST
        cache_key = f"rate_limit:{ip}:{path}:{method}"

        
        request_count = cache.get(cache_key,0)
        if request_count > self.rate_limit:
            return JsonResponse(
                {
                    'error': 'Rate limit exceeded',
                    'detail': f'Too many {method} requests to {path}. Try again in {self.time_window} seconds.',
                    'limit': self.rate_limit,
                    'window_seconds': self.time_window,
                },
                status=429
            )
        
        if request_count == 0:
            cache.set(cache_key,1,timeout = self.time_window)
        else:
            cache.incr(cache_key)
        return self.get_response(request)


    def get_client_ip(self,request):
        # Handles cases where app is behind a proxy/load balancer
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
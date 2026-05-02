# from django.http import HttpResponse
# class CustomClassAuthMiddleware:
#     def __init__(self,get_response):
#         self.get_response = get_response
#         print("middleware is used")#one time print

#     def __call__(self,request):
#         print(request.path)
#         response = HttpResponse("You can access this page")
#         return response
#     def process_view(self,request,view_func, view_args,view_kwargs):# before the view is exceuted
#         print("process view is used")
#         return None
#     def process_exception(self,request,exception):# before the view has finished excecuting, and exception is raised
#         print("process exception is used")
#         return None
#     def process_response(self,request,response):# after the view has finished excecuting
#         print("response is sent")
#         return response
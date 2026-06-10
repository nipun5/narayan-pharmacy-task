from django.urls import path

from .views import PrescriptionCollectionView, PrescriptionDetailView


urlpatterns = [
    path("prescriptions/", PrescriptionCollectionView.as_view(), name="prescriptions"),
    path(
        "prescriptions/<int:pk>/",
        PrescriptionDetailView.as_view(),
        name="prescription-detail",
    ),
]
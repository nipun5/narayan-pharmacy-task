from django.db import transaction
from django.db.models import Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Prescription, PrescriptionItem
from .serializers import (
    PrescriptionCreateSerializer,
    PrescriptionDetailSerializer,
    PrescriptionListSerializer,
)
from .services import check_drug_interactions


def prescription_queryset():
    return Prescription.objects.annotate(drug_count=Count("items")).prefetch_related(
        "items"
    )


class PrescriptionCollectionView(APIView):
    def get(self, request):
        prescriptions = prescription_queryset()
        serializer = PrescriptionListSerializer(prescriptions, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = PrescriptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        interaction = check_drug_interactions(data["drugs"])

        prescription = Prescription.objects.create(
            patient_name=data["patient_name"],
            doctor_name=data["doctor_name"],
            date=data["date"],
            interaction_data=interaction["interaction_data"],
            severity=interaction["severity"],
            interaction_status=interaction["interaction_status"],
            api_error=interaction["api_error"],
            used_cache=interaction["used_cache"],
        )
        PrescriptionItem.objects.bulk_create(
            [
                PrescriptionItem(
                    prescription=prescription,
                    drug_name=drug["name"],
                    dosage=drug["dosage"],
                )
                for drug in data["drugs"]
            ]
        )

        prescription = prescription_queryset().get(id=prescription.id)
        response_serializer = PrescriptionDetailSerializer(prescription)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class PrescriptionDetailView(APIView):
    def get(self, request, pk):
        try:
            prescription = prescription_queryset().get(pk=pk)
        except Prescription.DoesNotExist:
            return Response(
                {"detail": "Prescription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PrescriptionDetailSerializer(prescription)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            prescription = Prescription.objects.get(pk=pk)
        except Prescription.DoesNotExist:
            return Response(
                {"detail": "Prescription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        prescription.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

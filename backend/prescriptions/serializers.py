from rest_framework import serializers

from .models import Prescription, PrescriptionItem


class PrescriptionItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="drug_name")

    class Meta:
        model = PrescriptionItem
        fields = ["id", "name", "dosage"]
        read_only_fields = ["id"]


class PrescriptionListSerializer(serializers.ModelSerializer):
    drug_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "patient_name",
            "doctor_name",
            "date",
            "drug_count",
            "severity",
            "created_at",
        ]


class PrescriptionDetailSerializer(serializers.ModelSerializer):
    drugs = PrescriptionItemSerializer(source="items", many=True, read_only=True)
    drug_count = serializers.IntegerField(read_only=True)
    interaction_result = serializers.CharField(source="interaction_data", read_only=True)
    interaction_summary = serializers.CharField(source="interaction_data", read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "patient_name",
            "doctor_name",
            "date",
            "drugs",
            "drug_count",
            "interaction_result",
            "interaction_summary",
            "severity",
            "api_error",
            "used_cache",
            "created_at",
        ]


class DrugInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    dosage = serializers.CharField(max_length=255)


class PrescriptionCreateSerializer(serializers.Serializer):
    patient_name = serializers.CharField(max_length=255)
    doctor_name = serializers.CharField(max_length=255)
    date = serializers.DateField()
    drugs = DrugInputSerializer(many=True)

    def validate_drugs(self, drugs):
        cleaned = [
            {
                "name": drug["name"].strip(),
                "dosage": drug["dosage"].strip(),
            }
            for drug in drugs
            if drug.get("name", "").strip() and drug.get("dosage", "").strip()
        ]
        if not cleaned:
            raise serializers.ValidationError("At least one drug is required.")
        return cleaned
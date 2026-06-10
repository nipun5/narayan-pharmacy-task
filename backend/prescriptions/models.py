from django.db import models


class InteractionSeverity(models.TextChoices):
    NONE = "None", "None"
    MILD = "Mild", "Mild"
    MODERATE = "Moderate", "Moderate"
    SEVERE = "Severe", "Severe"


class Prescription(models.Model):
    patient_name = models.CharField(max_length=255)
    doctor_name = models.CharField(max_length=255)
    date = models.DateField()
    interaction_data = models.TextField(blank=True)
    severity = models.CharField(
        max_length=20,
        choices=InteractionSeverity.choices,
        default=InteractionSeverity.NONE,
    )
    api_error = models.TextField(blank=True)
    used_cache = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"], name="rx_created_at_idx"),
            models.Index(fields=["date"], name="rx_date_idx"),
            models.Index(fields=["severity"], name="rx_severity_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.patient_name} - {self.date}"

    @property
    def has_interaction_error(self) -> bool:
        return bool(self.api_error)


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(
        Prescription,
        related_name="items",
        on_delete=models.CASCADE,
    )
    drug_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=255)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["prescription", "drug_name"], name="rx_item_drug_name_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.drug_name} {self.dosage}".strip()


class DrugInteractionCache(models.Model):
    normalized_key = models.CharField(max_length=512, unique=True)
    interaction_data = models.TextField()
    severity = models.CharField(
        max_length=20,
        choices=InteractionSeverity.choices,
        default=InteractionSeverity.NONE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["-updated_at"], name="interaction_updated_idx"),
            models.Index(fields=["severity"], name="interaction_severity_idx"),
        ]

    def __str__(self) -> str:
        return self.normalized_key

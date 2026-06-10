from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="InteractionCache",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("cache_key", models.CharField(max_length=64, unique=True)),
                ("normalized_drugs", models.JSONField()),
                ("interaction_summary", models.TextField()),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("None", "None"),
                            ("Mild", "Mild"),
                            ("Moderate", "Moderate"),
                            ("Severe", "Severe"),
                        ],
                        default="None",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-updated_at"],
                "indexes": [
                    models.Index(
                        fields=["-updated_at"], name="interaction_updated_idx"
                    ),
                    models.Index(
                        fields=["severity"], name="interaction_severity_idx"
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="Prescription",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("patient_name", models.CharField(max_length=255)),
                ("doctor_name", models.CharField(max_length=255)),
                ("date", models.DateField()),
                ("interaction_summary", models.TextField(blank=True)),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("None", "None"),
                            ("Mild", "Mild"),
                            ("Moderate", "Moderate"),
                            ("Severe", "Severe"),
                        ],
                        default="None",
                        max_length=20,
                    ),
                ),
                ("api_error", models.TextField(blank=True)),
                ("used_cache", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["-created_at"], name="rx_created_at_idx"),
                    models.Index(fields=["date"], name="rx_date_idx"),
                    models.Index(fields=["severity"], name="rx_severity_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="PrescriptionDrug",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("dosage", models.CharField(max_length=255)),
                (
                    "prescription",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="drugs",
                        to="prescriptions.prescription",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
                "indexes": [
                    models.Index(
                        fields=["prescription", "name"], name="rx_drug_name_idx"
                    ),
                ],
            },
        ),
    ]

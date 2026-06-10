from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("prescriptions", "0001_initial"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="InteractionCache",
            new_name="DrugInteractionCache",
        ),
        migrations.RenameModel(
            old_name="PrescriptionDrug",
            new_name="PrescriptionItem",
        ),
        migrations.RenameField(
            model_name="druginteractioncache",
            old_name="cache_key",
            new_name="normalized_key",
        ),
        migrations.RenameField(
            model_name="druginteractioncache",
            old_name="interaction_summary",
            new_name="interaction_data",
        ),
        migrations.RenameField(
            model_name="prescription",
            old_name="interaction_summary",
            new_name="interaction_data",
        ),
        migrations.RenameField(
            model_name="prescriptionitem",
            old_name="name",
            new_name="drug_name",
        ),
        migrations.RemoveField(
            model_name="druginteractioncache",
            name="normalized_drugs",
        ),
        migrations.AlterField(
            model_name="druginteractioncache",
            name="normalized_key",
            field=models.CharField(max_length=512, unique=True),
        ),
        migrations.AlterModelOptions(
            name="druginteractioncache",
            options={"ordering": ["-updated_at"]},
        ),
        migrations.AlterModelOptions(
            name="prescriptionitem",
            options={"ordering": ["id"]},
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="DROP INDEX IF EXISTS rx_drug_name_idx",
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.RemoveIndex(
                    model_name="prescriptionitem",
                    name="rx_drug_name_idx",
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="prescriptionitem",
            index=models.Index(
                fields=["prescription", "drug_name"],
                name="rx_item_drug_name_idx",
            ),
        ),
    ]

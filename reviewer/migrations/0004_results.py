# Generated by Django 5.1.5 on 2025-02-22 07:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviewer', '0003_alter_moveanalysis_loss'),
    ]

    operations = [
        migrations.CreateModel(
            name='Results',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('White', models.TextField()),
                ('Black', models.TextField()),
                ('WhiteElo', models.IntegerField()),
                ('BlackElo', models.IntegerField()),
                ('white_accuracy', models.FloatField()),
                ('black_accuracy', models.FloatField()),
                ('white_arr', models.JSONField(default=list)),
                ('black_arr', models.JSONField(default=list)),
            ],
        ),
    ]

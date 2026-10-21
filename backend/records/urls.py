from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, DataSourceViewSet, IngestionRunViewSet, EmissionRecordViewSet, ReviewDecisionViewSet, AuditEventViewSet
from .ai_views import recommendations
router=DefaultRouter()
router.register('organizations',OrganizationViewSet,basename='organization')
router.register('data-sources',DataSourceViewSet,basename='datasource')
router.register('ingestion-runs',IngestionRunViewSet,basename='ingestionrun')
router.register('emission-records',EmissionRecordViewSet,basename='emissionrecord')
router.register('review-decisions',ReviewDecisionViewSet,basename='reviewdecision')
router.register('audit-events',AuditEventViewSet,basename='auditevent')
urlpatterns=[path('ai/recommendations/', recommendations, name='ai-recommendations'), path('',include(router.urls))]

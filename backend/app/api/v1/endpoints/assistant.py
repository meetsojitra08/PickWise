from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_optional_user
from app.core.response import ApiResponse, PaginatedResponse, PaginationLinks, PaginationMeta
from app.db.session import get_db, get_redis_client
from app.models import User
from app.schemas.assistant import (
    AiConversationDetailOut,
    AiConversationSummaryOut,
    AiQuotaOut,
    AssistantMessageOut,
    CreateConversationPayload,
    SendMessagePayload,
)
from app.services.assistant import AssistantService
from app.services.quota import AiQuotaService

router = APIRouter()


@router.get("/assistant/quota", response_model=ApiResponse[AiQuotaOut])
async def get_ai_quota(
    request: Request,
    current_user: User | None = Depends(get_optional_user),
):
    redis = get_redis_client()
    quota = await AiQuotaService.snapshot(redis, request, current_user)
    return ApiResponse(data=quota)


@router.get("/assistant/conversations", response_model=PaginatedResponse[AiConversationSummaryOut])
async def list_conversations(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    session_key = AssistantService.resolve_session_key(request)
    summaries, total, last_page = await AssistantService.list_conversations(
        db=db,
        user=current_user,
        session_key=session_key,
        page=page,
        per_page=per_page,
    )
    return PaginatedResponse(
        data=summaries,
        meta=PaginationMeta(
            current_page=page,
            per_page=per_page,
            total=total,
            last_page=last_page,
        ),
        links=PaginationLinks(
            first=f"/api/v1/assistant/conversations?page=1&per_page={per_page}",
            last=f"/api/v1/assistant/conversations?page={last_page}&per_page={per_page}",
            prev=f"/api/v1/assistant/conversations?page={page - 1}&per_page={per_page}"
            if page > 1
            else None,
            next=f"/api/v1/assistant/conversations?page={page + 1}&per_page={per_page}"
            if page < last_page
            else None,
        ),
    )


@router.post(
    "/assistant/conversations",
    response_model=ApiResponse[AiConversationDetailOut],
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    request: Request,
    payload: CreateConversationPayload | None = None,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    session_key = AssistantService.resolve_session_key(request)
    title = payload.title if payload else None
    conv = await AssistantService.create_conversation(
        db=db,
        user=current_user,
        session_key=session_key,
        title=title,
    )
    return ApiResponse(data=conv)


@router.get("/assistant/conversations/{id}", response_model=ApiResponse[AiConversationDetailOut])
async def get_conversation(
    id: int,
    request: Request,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    session_key = AssistantService.resolve_session_key(request)
    conv = await AssistantService.get_conversation(
        db=db,
        conversation_id=id,
        user=current_user,
        session_key=session_key,
    )
    return ApiResponse(data=conv)


@router.delete("/assistant/conversations/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    id: int,
    request: Request,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    session_key = AssistantService.resolve_session_key(request)
    await AssistantService.delete_conversation(
        db=db,
        conversation_id=id,
        user=current_user,
        session_key=session_key,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/assistant/conversations/{id}/messages",
    response_model=ApiResponse[AssistantMessageOut],
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    id: int,
    payload: SendMessagePayload,
    request: Request,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    session_key = AssistantService.resolve_session_key(request)
    redis = get_redis_client()
    msg = await AssistantService.send_message(
        db=db,
        redis=redis,
        conversation_id=id,
        user=current_user,
        session_key=session_key,
        payload=payload,
        request=request,
    )
    return ApiResponse(data=msg)

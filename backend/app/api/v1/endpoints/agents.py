"""API endpoint exposing the canonical agent registry under /api/v1/agents."""

from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from app.agents import AGENT_REGISTRY

router = APIRouter()


class AgentRegistryEntry(BaseModel):
    """Metadata for a single registered pipeline agent."""

    name: str
    display_name: str
    role: str
    description: str


@router.get(
    "",
    response_model=List[AgentRegistryEntry],
    summary="List registered pipeline agents",
    description=(
        "Returns the canonical ordered list of agents in the PatchPilot AI Agent Engine "
        "pipeline, including their names, roles, and descriptions. "
        "This is the single source of truth for agent count and metadata."
    ),
)
def list_agents() -> List[AgentRegistryEntry]:
    """Return the canonical agent registry as a typed list."""
    return [AgentRegistryEntry(**entry) for entry in AGENT_REGISTRY]

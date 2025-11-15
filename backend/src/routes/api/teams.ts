import { Router } from 'express';
import { TeamService } from '../../services/team-service';
import { logger } from '../../lib/logger';
import {
  authenticateToken,
  requirePermission,
  AuthenticatedRequest,
  Resource,
  Action
} from '../../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/v1/teams - List teams
router.get('/', requirePermission(Resource.TEAMS, Action.LIST), async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 50, search, is_active } = req.query;

    const result = await TeamService.listTeams({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      isActive: is_active ? is_active === 'true' : undefined,
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    return res.json({
      ok: true,
      teams: result.teams,
      pagination: result.pagination,
    });

  } catch (error: any) {
    logger.error('list_teams_endpoint_error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// POST /api/v1/teams - Create team
router.post('/', requirePermission(Resource.TEAMS, Action.CREATE), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, timezone, stateId } = req.body;

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Team name is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await TeamService.createTeam({
      name,
      timezone: timezone || 'UTC',
      stateId,
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('team_created', {
      teamId: result.team?.id,
      name: result.team?.name,
      createdBy: (req as any).user?.id,
    });

    return res.status(201).json({
      ok: true,
      team: result.team,
    });

  } catch (error: any) {
    logger.error('create_team_endpoint_error', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// GET /api/v1/teams/:id - Get team by ID
router.get('/:id', requirePermission(Resource.TEAMS, Action.READ), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Team ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await TeamService.getTeam(id);

    if (!result.success) {
      return res.status(404).json({
        ok: false,
        error: result.error,
      });
    }

    return res.json({
      ok: true,
      team: result.team,
    });

  } catch (error: any) {
    logger.error('get_team_endpoint_error', {
      error: error.message,
      stack: error.stack,
      teamId: req.params.id,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// PUT /api/v1/teams/:id - Update team
router.put('/:id', requirePermission(Resource.TEAMS, Action.UPDATE), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, timezone } = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Team ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await TeamService.updateTeam(id, {
      name,
      timezone,
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('team_updated', {
      teamId: id,
      updatedBy: (req as any).user?.id,
    });

    return res.json({
      ok: true,
      team: result.team,
    });

  } catch (error: any) {
    logger.error('update_team_endpoint_error', {
      error: error.message,
      stack: error.stack,
      teamId: req.params.id,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

// DELETE /api/v1/teams/:id - Delete team (soft delete)
router.delete('/:id', requirePermission(Resource.TEAMS, Action.DELETE), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Team ID is required',
          request_id: req.headers['x-request-id'],
        },
      });
    }

    const result = await TeamService.deleteTeam(id);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error,
      });
    }

    logger.info('team_deleted', {
      teamId: id,
      deletedBy: (req as any).user?.id,
    });

    return res.json({
      ok: true,
      message: 'Team deleted successfully',
    });

  } catch (error: any) {
    logger.error('delete_team_endpoint_error', {
      error: error.message,
      stack: error.stack,
      teamId: req.params.id,
    });

    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        request_id: req.headers['x-request-id'],
      },
    });
  }
});

export default router;
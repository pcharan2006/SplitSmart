const ApiError = require('../utils/ApiError');
const groupModel = require('../models/groupModel');

// Use on any route containing the group id in the URL (default param name: "id").
// Guarantees the logged-in user belongs to that group. Every group endpoint must use this.
// Sets req.group and req.membership.
function requireGroupMember(param = 'id') {
  return async (req, res, next) => {
    const groupId = Number(req.params[param]);
    const group = await groupModel.findById(groupId);
    // Same 404 for "doesn't exist" and "not yours" so group ids can't be probed.
    const membership = group && (await groupModel.findMembership(groupId, req.user.id));
    if (!group || !membership) throw new ApiError(404, 'Group not found');
    req.group = group;
    req.membership = membership;
    next();
  };
}

// Use AFTER requireGroupMember.
function requireGroupAdmin(req, res, next) {
  if (req.membership.role !== 'admin') throw new ApiError(403, 'Only group admins can do this');
  next();
}

// Use AFTER requireGroupMember on routes that change group data.
function requireActiveGroup(req, res, next) {
  if (req.group.is_archived) throw new ApiError(409, 'This group is archived and read-only');
  next();
}

module.exports = { requireGroupMember, requireGroupAdmin, requireActiveGroup };

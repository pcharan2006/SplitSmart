const groupService = require('../services/groupService');
const groupModel = require('../models/groupModel');

exports.create = async (req, res) => {
  res.status(201).json({ group: await groupService.createGroup(req.user.id, req.body) });
};

exports.list = async (req, res) => {
  res.json({ groups: await groupService.listGroups(req.user.id) });
};

exports.get = async (req, res) => {
  const group = await groupService.getGroupDetails(req.group.id);
  res.json({ group: { ...group, my_role: req.membership.role } });
};

exports.update = async (req, res) => {
  res.json({ group: await groupService.updateGroup(req.group.id, req.body) });
};

exports.remove = async (req, res) => {
  await groupService.deleteGroup(req.group);
  res.status(204).end();
};

exports.archive = async (req, res) => {
  await groupModel.setArchived(req.group.id, true);
  res.json({ message: 'Group archived' });
};

exports.unarchive = async (req, res) => {
  await groupModel.setArchived(req.group.id, false);
  res.json({ message: 'Group restored' });
};

exports.addMember = async (req, res) => {
  const group = await groupService.addMemberByEmail(req.group, req.user, req.body.email);
  res.status(201).json({ group });
};

exports.removeMember = async (req, res) => {
  await groupService.removeMember(req.group, req.user, req.membership, Number(req.params.userId));
  res.status(204).end();
};

exports.createInvite = async (req, res) => {
  res.status(201).json(await groupService.createInvite(req.group, req.user.id));
};

exports.join = async (req, res) => {
  res.json({ group: await groupService.joinByCode(req.user.id, req.body.code) });
};

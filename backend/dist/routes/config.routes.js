"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_controller_1 = require("../controllers/config.controller");
const router = (0, express_1.Router)();
// Get all configs
router.get('/', config_controller_1.getAllConfigs);
// Get config by ID
router.get('/:id', config_controller_1.getConfigById);
// // Dynamic search
// router.get('/search', searchConfigs);
// Create config
// router.post('/', createConfig);
// // Update config
// router.put('/:id', updateConfig);
// router.delete('/:id', deleteConfig);
exports.default = router;
//# sourceMappingURL=config.routes.js.map
<?php

use Kirby\Cms\Page;
use Kirby\Cms\R;
use Kirby\Filesystem\F;
use Kirby\Http\Header;

Kirby\Cms\App::plugin('arnoson/kirby-deploy', [
  'snippets' => [
    'maintenance' => __DIR__ . '/maintenance.php'
  ],
  'routes' => [
    [
      'pattern' => 'plugin-kirby-deploy/(:all)',
      'action' => function($command) {
        $token = option('arnoson.kirby-deploy.token');
        $bearer = kirby()->request()->header('Authorization');

        if ($bearer !== "Bearer $token") {
          Header::status(401);
          die();
        }

        $maintenanceFile = kirby()->root('index') . '/.maintenance';

        if ($command === 'start') {
          F::write($maintenanceFile, '');
        } else if ($command === 'finish') {
          F::remove($maintenanceFile);
          kirby()->cache('pages')->flush();
        }

        return ['status' => 'ok'];
      }
    ]
  ],
  'hooks' => [
    'route:before' => function($route, $path) {
      $maintenanceFile = kirby()->root('index') . '/.maintenance';
      if (
        F::exists($maintenanceFile) &&
        !str_starts_with($path, 'plugin-kirby-deploy/')
      ) {
        snippet('maintenance');
        die();
      }
    }
  ]
]);

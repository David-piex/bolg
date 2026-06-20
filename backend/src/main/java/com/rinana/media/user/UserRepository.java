package com.rinana.media.user;

import com.rinana.media.common.Role;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface UserRepository {
  Optional<UserEntity> findUserById(UUID id);

  Optional<UserEntity> findByUsername(String username);

  Optional<UserEntity> findByEmail(String email);

  boolean existsByUsername(String username);

  boolean existsByEmail(String email);

  Optional<UserEntity> findByRole(Role role);

  long countByRole(Role role);

  List<UserEntity> findAllUsers();

  UserEntity saveUser(UserEntity user);
}
